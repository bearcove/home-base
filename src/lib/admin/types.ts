export type AssetProgress = {
    uploaded: number;
    total: number;
};

export type DeployComplete = {
    complete: boolean;
    domain: string;
};

export type LogMessage = {
    level: "debug" | "info" | "warn" | "error";
    message: string;
    url?: string;
};

export type DeployMessage =
    | { assetProgress: AssetProgress }
    | { logMessage: LogMessage }
    | { deployComplete: DeployComplete };

export type RouteResult = {
    url: string; // Assuming AbsoluteUrl is represented as a string in TypeScript
    status: number;
};

export type ValidationComplete = {
    num_errors: number;
};

export type BadLink = {
    route: string;
    href: string;
    reason: String;
};

export type MathError = {
    route: string;
};

export type ValidationMessage =
    | { routeResult: RouteResult }
    | { logMessage: LogMessage }
    | { badLink: BadLink }
    | { mathError: MathError }
    | { validationComplete: ValidationComplete };
