const isProduction = process.env.NODE_ENV === "production";

export const SESSION_IDLE_TIMEOUT_SECONDS = 10 * 60;

export const authCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/"
};

export const sessionCookieOptions = {
    ...authCookieOptions,
    maxAge: SESSION_IDLE_TIMEOUT_SECONDS * 1000
};

export const adminProfileCookieOptions = {
    ...sessionCookieOptions
};