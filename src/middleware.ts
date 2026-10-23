import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, isLang, LANG_COOKIE, type Lang } from "@/i18n/config";

/** Visitors' language: saved choice first, then the browser's preference. */
function preferredLang(req: NextRequest): Lang {
  const saved = req.cookies.get(LANG_COOKIE)?.value;
  if (isLang(saved)) return saved;
  const accept = req.headers.get("accept-language")?.toLowerCase() ?? "";
  const first = accept.split(",")[0]?.trim() ?? "";
  return first.startsWith("en") ? "en" : DEFAULT_LANG;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const seg = pathname.split("/")[1];
  if (isLang(seg)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/${preferredLang(req)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the API, the admin, Next internals and files with an extension.
  matcher: ["/((?!api|admin|_next|.*\\..*).*)"],
};
