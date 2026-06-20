// import { AnyZodObject, ZodError } from "zod";
// import { Request, Response, NextFunction } from "express";

// export const validate =
//   (schema: AnyZodObject) =>
//   (req: Request, _res: Response, next: NextFunction) => {
//     try {
//       const result = schema.parse({
//         body: req.body,
//         query: req.query,
//         params: req.params,
//       });

//       req.body = result.body;
//       req.query = result.query;
//       req.params = result.params;

//       next();
//     } catch (error) {
//       if (error instanceof ZodError) {
//         next(error);
//         return;
//       }

//       next(error);
//     }
//   };
