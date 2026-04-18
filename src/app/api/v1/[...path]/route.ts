import { NextRequest, NextResponse } from "next/server";

const BACKEND = "https://financestreamai-backend.onrender.com/api/v1";

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = new URL(req.url);
  const qs = url.search;
  const resp = await fetch(`${BACKEND}/${path}${qs}`, {
    headers: { "Content-Type": "application/json" },
  });
  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const body = await req.text();
  const resp = await fetch(`${BACKEND}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const body = await req.text();
  const resp = await fetch(`${BACKEND}/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const resp = await fetch(`${BACKEND}/${path}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}
