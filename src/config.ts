import dotenv from "dotenv";
dotenv.config();

function envOrThrow(key: string): string {
   
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

type Config = {
  db: DBConfig;
  port: number;
};

type DBConfig = {
  url: string;
};

export const config: Config = {
  db: {
    url: envOrThrow("DB_URL"),
  },
  port: Number(process.env.PORT) || 3000,
};
