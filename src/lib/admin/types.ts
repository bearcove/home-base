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
  | { AssetProgress: AssetProgress }
  | { LogMessage: LogMessage }
  | { DeployComplete: DeployComplete };

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
  | { RouteResult: RouteResult }
  | { LogMessage: LogMessage }
  | { BadLink: BadLink }
  | { MathError: MathError }
  | { ValidationComplete: ValidationComplete };
