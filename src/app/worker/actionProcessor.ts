import nodemailer from "nodemailer";
import { Job } from "../../db/schema.js";

type ActionResult = Record<string, unknown>;

// ─── Action 1: CALCULATE_TOTAL ────────────────────────────────────────────────
// Iterates an array inside the payload and sum the values of a number field.
// Config: { arrayField: "items", priceField: "price", quantityField: "quantity" }

function calculateTotal(
  payload: ActionResult,
  config: { arrayField: string; priceField: string; quantityField?: string },
): ActionResult {
  const array = payload[config.arrayField];

  if (!array || !Array.isArray(array) || array.length === 0) {
    throw new Error(
      `Field "${config.arrayField}" does not exist or it's not in payload.`,
    );
  }

  const quantityProp = config.quantityField ?? "quantity";

  const total = array.reduce((sum: number, item: unknown, index: number) => {
    const record = item as Record<string, unknown>;

    const priceRaw = record[config.priceField];
    const quantityRaw =
      record[quantityProp] !== undefined ? record[quantityProp] : 1;

    if (priceRaw === undefined || priceRaw === null) {
      throw new Error(
        `Error: The item on index ${index} does not contain the price.`,
      );
    }

    const price = Number(priceRaw);
    if (typeof priceRaw !== "number" || Number.isNaN(price)) {
      throw new Error(
        `Error: Price field on item ${index} is not a valid number.`,
      );
    }

    const quantity =
      quantityRaw !== undefined && quantityRaw !== null
        ? Number(quantityRaw)
        : 1;
    if (typeof quantityRaw !== "number" || Number.isNaN(quantity)) {
      throw new Error(
        `Error: Quantity field on item ${index} is not a valid number.`,
      );
    }

    return sum + price * quantity;
  }, 0);

  return {
    ...payload,
    subtotal: total,
    total_amount: total,
  };
}

// ─── Action 2: TEXT_TEMPLATER ─────────────────────────────────────────────────
// Replaces {{field}} variables. Auto-formats arrays for item summaries
// Config: { template: "..." }

function textTemplater(
  payload: ActionResult,
  config: { template: string },
): ActionResult {
  const fallbacks: Record<string, string> = {
    customer: "dear client",
    store_name: "our store",
    date: new Date().toISOString().split("T")[0], // Today's date
    status: "Confirmed",
  };

  const formatted = config.template.replace(
    /\{\{(\w+)\}\}/g,
    (_match, key: string) => {
      const value = payload[key];

      if (Array.isArray(value)) {
        if (value.length === 0) return "(No selected products. Please contact support.)";
        return value
          .map(
            (item) =>
              `- ${item.name || "Item"} (x${item.quantity || 1}): $${item.price || 0}`,
          )
          .join("\n");
      }

      if (value !== undefined && value !== null && value !== "") {
        return String(value);
      }

    // If it doesn't exist in payload, uses fallback. If doesn't, it's left empty.
      return fallbacks[key] !== undefined ? fallbacks[key] : "";
    },
  );

  return {
    ...payload,
    formatted_text: formatted,
  };
}

// ─── Action 3: TRANSLATE_TEXT ─────────────────────────────────────────────────
// Translates text field using MyMemory API via fetch.
// Config: { textField: "message", languageField: "lang" }

// const defaultMessages: Record<string, string> = {
//   en: "Your order has been processed. Thank you for your purchase.",
// };

async function translateText(
  payload: ActionResult,
  config: { textField: string; languageField: string; subjectField?: string },
): Promise<ActionResult> {
  const targetLang = (payload[config.languageField] as string) ?? "en";
  const textToTranslate = payload[config.textField] as string;
  const subjectToTranslate = config.subjectField
    ? (payload[config.subjectField] as string)
    : undefined;

  if (!textToTranslate || typeof textToTranslate !== "string") {
    throw new Error(
      `Field "${config.textField}" is missing or not a string in the payload`,
    );
  }

  //if the client's language is english, we don't fetch the API
  if (targetLang.toLowerCase() === "en") {
    return {
      ...payload,
      translated_text: textToTranslate,
      ...(subjectToTranslate ? { translated_subject: subjectToTranslate } : {}),
    };
  }

  // rate limiting, waits 10s
  await new Promise((resolve) => setTimeout(resolve, 10000));

  let translatedText = textToTranslate;
  let translatedSubject = subjectToTranslate;

  const fetchTranslation = async (text: string): Promise<string> => {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`,
    );

    if (!response.ok) throw new Error("Translation API response was not ok");

    const data = await response.json();
    if (data.responseStatus === 200) {
      return data.responseData.translatedText;
    }
    throw new Error(data.responseDetails || "API internal error");
  };

  try {
    translatedText = await fetchTranslation(textToTranslate);
  } catch (error) {
    console.warn(
      `[Translate API] Body translation unavailable. Using default message. ${error}`,
    );
    console.log(`──────────────────────────────────────────────────\n`);
  }

  // Translate the subject (if given in the config)
  if (subjectToTranslate) {
    try {
      translatedSubject = await fetchTranslation(subjectToTranslate);
    } catch (error) {
      console.warn(
        `[Translate API] Subject translation unavailable. Using default message. ${error}`,
      );
      console.log(`──────────────────────────────────────────────────\n`);
    }
  }

  return {
    ...payload,
    translated_text: translatedText,
    ...(config.subjectField ? { translated_subject: translatedSubject } : {}),
  };
}

// ─── Action 4: SEND_EMAIL ─────────────────────────────────────────────────────
// Sends formatted_text field as an email using Ethereal Email
// Config: { toField: "email", subjectField: "subject", bodyField: "formatted_text" }

async function sendEmail(
  payload: ActionResult,
  config: { toField: string; subjectField?: string; bodyField?: string },
): Promise<ActionResult> {
  const to = payload[config.toField] as string;

  if (!to || typeof to !== "string") {
    throw new Error(
      `Error: Field "${config.toField}" is missing or is not a valid email.`,
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    throw new Error(
      `Error: Given value (${to}) it's not a valid email format.`,
    );
  }

  const subject =
    config.subjectField && payload[config.subjectField]
      ? (payload[config.subjectField] as string)
      : "Order confirmation";

  const bodyField = config.bodyField ?? "formatted_text";
  const text = (payload[bodyField] as string) ?? JSON.stringify(payload);

  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });

    const htmlBody = text.replace(/\n/g, "<br>");

    const htmlTemplate = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 550px; margin: 20px auto; padding: 30px; border: 1px solid #eef2f5; border-radius: 10px; color: #333333; line-height: 1.6; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
    <div style="border-bottom: 2px solid #f1f3f5; padding-bottom: 15px; margin-bottom: 20px;">
    <h2 style="margin: 0; color: #2c3e50; font-size: 20px; font-weight: 600;">${subject}</h2>
    </div>
    
    <div style="font-size: 15px; color: #4a5568;">
    ${htmlBody}
    </div>
    
    <div style="margin-top: 35px; border-top: 1px solid #f1f3f5; padding-top: 15px; text-align: center;">
    <p style="font-size: 12px; color: #a0aec0; margin: 0;">
    This is an automated email sent by the order system Storey.
    </p>
    </div>
    </div>
    `;

    const info = await transporter.sendMail({
      from: '"Sales system - Storey" <sales@storey.com>',
      to,
      subject,
      html: htmlTemplate,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`──────────────────────────────────────────────────\n`);
    console.log(`-> Email preview URL: ${previewUrl}`);
    console.log(`──────────────────────────────────────────────────\n`);

    return {
      ...payload,
      email_sent: true,
      email_preview_url: previewUrl || null,
    };
  } catch (error) {
    console.error(
      "Error connecting to email service or sending email: ",
      error,
    );
    throw new Error(
      `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// ─── Main runner ─────────────────────────────────────────────────────────

export async function processJob(
  job: Job,
  actionName: string,
  actionConfig: Record<string, unknown> | null,
): Promise<ActionResult> {
  const payload = job.payload as ActionResult;
  const config = actionConfig ?? {};

  // Validate that actionName is one of the existing action types before executing
  const existingActions = [
    "CALCULATE_TOTAL",
    "TEXT_TEMPLATER",
    "TRANSLATE_TEXT",
    "SEND_EMAIL",
  ];
  if (!existingActions.includes(actionName)) {
    throw new Error(
      `Unknown action: "${actionName}". Valid actions are: ${existingActions.join(", ")}`,
    );
  }

  // Validate that config exists for actions that require it
  if (actionName !== "SEND_EMAIL" && Object.keys(config).length === 0) {
    throw new Error(
      `Action "${actionName}" requires a config object but none was provided.`,
    );
  }

  switch (actionName) {
    case "CALCULATE_TOTAL":
      return calculateTotal(
        payload,
        config as {
          arrayField: string;
          priceField: string;
          quantityField?: string;
        },
      );

    case "TRANSLATE_TEXT":
      return await translateText(
        payload,
        config as {
          textField: string;
          languageField: string;
          subjectField?: string;
        },
      );

    case "TEXT_TEMPLATER":
      return textTemplater(payload, config as { template: string });

    case "SEND_EMAIL":
      return await sendEmail(
        payload,
        config as {
          toField: string;
          subjectField?: string;
          bodyField?: string;
        },
      );

    default:
      throw new Error(`Unknown action: "${actionName}"`);
  }
}
