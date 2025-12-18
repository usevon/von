import { secrets } from "bun";
import { client } from "../setup";

const isIntegrationTest = process.argv.some((arg) =>
  arg.includes("integration")
);

const validateKey = async (key: string): Promise<boolean> => {
  const { error } = await client.register.post(
    { port: 3000 },
    { headers: { authorization: `Bearer ${key}` } }
  );
  return error?.status !== 401;
};

const promptUntilValid = async () => {
  while (true) {
    const key = prompt(
      "Enter your VON_API_KEY (or press Enter to skip):"
    )?.trim();
    if (!key) {
      return;
    }

    const valid = await validateKey(key);
    if (valid) {
      await secrets.set({ service: "von", name: "VON_API_KEY", value: key });
      process.env.VON_API_KEY = key;
      console.log("Saved to OS keychain\n");
      return;
    }
    console.log("Invalid API key, try again");
  }
};

const init = async () => {
  if (!isIntegrationTest || process.env.VON_API_KEY) {
    return;
  }

  const saved = await secrets.get({ service: "von", name: "VON_API_KEY" });

  if (saved) {
    const valid = await validateKey(saved);
    if (valid) {
      process.env.VON_API_KEY = saved;
    } else {
      console.log("\nSaved API key is invalid");
      await secrets.delete({ service: "von", name: "VON_API_KEY" });
      await promptUntilValid();
    }
  } else {
    console.log("\nNo API key found for integration tests");
    await promptUntilValid();
  }
};

void init();

export const getApiKey = () => process.env.VON_API_KEY;
