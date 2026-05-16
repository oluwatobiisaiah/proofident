import { type NextRequest, NextResponse } from "next/server";

const authRoutes = ["/login"];

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // const isAuthRoute = authRoutes.some((route) => path === route || path.startsWith(`${route}`));

  // const token =
  //   request.cookies.get("next-auth.session-token")?.value ||
  //   request.cookies.get("__Secure-next-auth.session-token")?.value;
 
  // if (!token && !isAuthRoute) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }
 
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.well-known).*)"],
};
