const isProduction = process.env.NODE_ENV === "production";

export const authCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/"
};

export const adminProfileCookieOptions = {
    ...authCookieOptions,
    maxAge: 60 * 60 * 1000
};