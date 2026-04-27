import { NextResponse } from "next/server";
import {
  deleteEmailAccount,
  getEmailAccount,
  saveEmailAccount,
} from "@/lib/db";
import { testConnection } from "@/lib/email";

export const runtime = "nodejs";

function strip(account: ReturnType<typeof getEmailAccount>) {
  if (!account) return null;
  // Never return the password to the client.
  const { password: _password, ...safe } = account;
  return safe;
}

export async function GET() {
  try {
    return NextResponse.json({ account: strip(getEmailAccount()) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ account: null, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid json" }, { status: 400 });

  const required = ["host", "username", "password"] as const;
  for (const k of required) {
    if (!body[k] || typeof body[k] !== "string") {
      return NextResponse.json({ error: `${k} is required` }, { status: 400 });
    }
  }

  const account = {
    host: String(body.host).trim(),
    port: Number.isFinite(Number(body.port)) ? Number(body.port) : 993,
    secure: body.secure !== false,
    username: String(body.username).trim(),
    password: String(body.password),
    mailbox: typeof body.mailbox === "string" && body.mailbox.trim()
      ? body.mailbox.trim()
      : "INBOX",
  };

  try {
    await testConnection(account);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Could not connect: ${message}` },
      { status: 400 }
    );
  }

  const saved = saveEmailAccount(account);
  return NextResponse.json({ account: strip(saved) });
}

export async function DELETE() {
  deleteEmailAccount();
  return NextResponse.json({ ok: true });
}
