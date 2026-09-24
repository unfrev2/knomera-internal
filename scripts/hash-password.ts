import bcrypt from "bcryptjs";

function encodePasswordHashForEnv(bcryptHash: string): string {
  return Buffer.from(bcryptHash, "utf8").toString("base64");
}

async function main() {
  const password = process.argv[2];
  const userArg = process.argv[3]; // optional: jon | ahmed

  if (!password) {
    console.error('Usage: npm run hash-password -- "your-password" [jon|ahmed]');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const encoded = encodePasswordHashForEnv(hash);

  console.log("Paste into .env.local:");
  if (userArg === "ahmed") {
    console.log(`AHMED_PASSWORD_HASH=${encoded}`);
  } else if (userArg === "jon") {
    console.log(`JON_PASSWORD_HASH=${encoded}`);
  } else {
    console.log(`JON_PASSWORD_HASH=${encoded}`);
    console.log(`AHMED_PASSWORD_HASH=${encoded}`);
  }
  console.log("");
  console.log("Then restart the dev server (env changes are not hot-reloaded).");
}

main();
