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

  if (!Array.isArray(array)) {
    throw new Error(
      `Field "${config.arrayField}" is not an array in the payload`,
    );
  }

  const quantityProp = config.quantityField ?? "quantity";

  const total = array.reduce((sum: number, item: unknown) => {
    const record = item as Record<string, unknown>;
    const price = Number(record[config.priceField]) || 0;

    const quantity = Number(record[quantityProp]) || 1;

    return sum + price * quantity;
  }, 0);

  return {
    ...payload,
    subtotal: total,
    total_amount: total,
  };
}

// ─── Action 2: TRANSLATE_TEXT ─────────────────────────────────────────────────
// Translates text field using MyMemory API via fetch.
// Config: { textField: "message", languageField: "lang" }

const defaultMessages: Record<string, string> = {
  en: "Your order has been processed. Thank you for your purchase.",
};

async function translateText(
  payload: ActionResult,
  config: { textField: string; languageField: string },
): Promise<ActionResult> {
  const targetLang = (payload[config.languageField] as string) ?? "en";
  const textToTranslate = payload[config.textField] as string;

  if (!textToTranslate || typeof textToTranslate !== "string") {
    throw new Error(
      `Field "${config.textField}" is missing or not a string in the payload`,
    );
  }

  // rate limiting, waits 10s
  await new Promise((resolve) => setTimeout(resolve, 10000));

  let translatedText = textToTranslate;

  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=es|${targetLang}`,
    );

    if (!response.ok) throw new Error("Translation API response was not ok");

    const data = await response.json();
    if (data.responseStatus === 200) {
      translatedText = data.responseData.translatedText;
    } else {
      throw new Error(data.responseDetails || "API internal error");
    }
  } catch {
    // If the translation fails, use local messages
    console.warn(`Translation API unavailable.`);
    // translatedText = defaultMessages["en"];
  }

  return {
    ...payload,
    translated_text: translatedText,
  };
}

// ─── Action 3: TEXT_TEMPLATER ─────────────────────────────────────────────────
// Replaces {{field}} variables. Auto-formats arrays for item summaries
// Config: { template: "..." }

function textTemplater(
  payload: ActionResult,
  config: { template: string },
): ActionResult {
  const formatted = config.template.replace(
    /\{\{(\w+)\}\}/g,
    (_match, key: string) => {
      const value = payload[key];

      if (Array.isArray(value)) {
        return value
          .map(
            (item) =>
              `- ${item.name || "Item"} (x${item.quantity || 1}): $${item.price || 0}`,
          )
          .join("\n");
      }

      return value !== undefined ? String(value) : `{{${key}}}`;
    },
  );

  return {
    ...payload,
    formatted_text: formatted,
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
  const subject =
    config.subjectField && payload[config.subjectField]
      ? (payload[config.subjectField] as string)
      : "Order confirmation";

  const bodyField = config.bodyField ?? "formatted_text";
  const text = (payload[bodyField] as string) ?? JSON.stringify(payload);

  if (!to || typeof to !== "string") {
    throw new Error(`Field "${config.toField}" is not a valid email`);
  }

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
          Este es un correo electrónico automatizado enviado por el sistema de órdenes.
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
  console.log(`-> Email preview URL: ${previewUrl}`);

  return {
    ...payload,
    email_sent: true,
    email_preview_url: previewUrl || null,
  };
}

// ─── Main runner ─────────────────────────────────────────────────────────

export async function processJob(
  job: Job,
  actionName: string,
  actionConfig: Record<string, unknown> | null,
): Promise<ActionResult> {
  const payload = job.payload as ActionResult;
  const config = actionConfig ?? {};

  switch (actionName) {
    case "CALCULATE_TOTAL":
      return calculateTotal(
        payload,
        config as { arrayField: string; priceField: string },
      );

    case "TRANSLATE_TEXT":
      return await translateText(
        payload,
        config as { textField: string; languageField: string },
      );

    case "TEXT_TEMPLATER":
      return textTemplater(payload, config as { template: string });

    case "SEND_EMAIL":
      return await sendEmail(
        payload,
        config as { toField: string; subjectField?: string },
      );

    default:
      throw new Error(`Unknown action: "${actionName}"`);
  }
}
