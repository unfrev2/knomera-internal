import bcrypt from "bcryptjs";

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error("Usage: npm run hash-password -- <password>");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  // Next.js env loading expands $VAR. Escape each $ as \$ for .env files.
  const escaped = hash.replace(/\$/g, "\\$");

  console.log("Hash:");
  console.log(hash);
  console.log("");
  console.log("Paste into .env.local (escaped for Next.js env expansion):");
  console.log(`JON_PASSWORD_HASH=${escaped}`);
  console.log("# or");
  console.log(`AHMED_PASSWORD_HASH=${escaped}`);
}

main();
