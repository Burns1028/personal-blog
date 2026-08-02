export function publishError(
  status: number,
  code: string,
  message: string,
): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function publishSuccess(data: unknown, status = 200): Response {
  return Response.json(
    { data },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function publishAuthError(): Response {
  return publishError(401, "PUBLISH_AUTH_REQUIRED", "发布凭据无效。");
}
