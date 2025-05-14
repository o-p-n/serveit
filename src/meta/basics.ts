
export interface MetaHandler {
  readonly path: string;
  readonly method: string;

  handle(req: Request): Promise<Response>;
}
