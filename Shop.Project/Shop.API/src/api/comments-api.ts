import { Request, Response, Router } from "express";
import { CommentCreatePayload, ICommentEntity } from "../../types";
import { IComment } from "@Shared/types";
import { validateComment } from "../helpers";
import { v4 as uuidv4 } from "uuid";
import { connection } from "../..";
import { mapCommentsEntity } from "../services/mapping";
import { ResultSetHeader } from "mysql2";
import { findDuplicateQuery, insertCommentQuery } from "../services/queries";

export const commentsRouter = Router();

commentsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const [comments] = await connection.query<ICommentEntity[]>(
      "SELECT * FROM comments"
    );

    res.setHeader("Content-Type", "application/json");
    res.send(mapCommentsEntity(comments));
  } catch (e) {
    console.debug(e.message);
    res.status(500);
    res.send("Something went wrong");
  }
});

commentsRouter.get(
  "/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const [rows] = await connection.query<ICommentEntity[]>(
        "SELECT * FROM comments WHERE comment_id = ?",
        [req.params.id]
      );

      if (!rows?.[0]) {
        res.status(404);
        res.send(`Comment with id ${req.params.id}} is not found`);
        return;
      }
      res.setHeader("Content-Type", "application/json");
      res.send(mapCommentsEntity(rows)[0]);
    } catch (e) {
      console.debug(e.message);
      res.status(500);
      res.send("Something went wrong");
    }
  }
);

commentsRouter.post(
  "/",
  async (req: Request<{}, {}, CommentCreatePayload>, res: Response) => {
    const validationResult = validateComment(req.body);

    if (validationResult) {
      res.status(400);
      res.send(validationResult);
      return;
    }

    try {
      const { name, email, body, productId } = req.body;

      const [sameResult] = await connection.query<ICommentEntity[]>(
        findDuplicateQuery,
        [email.toLowerCase(), name.toLowerCase(), body.toLowerCase(), productId]
      );

      console.log(sameResult[0]?.comment_id);

      if (sameResult.length) {
        res.status(422);
        res.send("Comment with the same fields already exists");
        return;
      }

      const id = uuidv4();

      const [info] = await connection.query<ResultSetHeader>(
        insertCommentQuery,
        [id, email, name, body, productId]
      );

      console.log(info);
      res.status(201);
      res.send(`Comment with id:${id} has been added`);
    } catch (e) {
      console.debug(201);
      res.status(500);
      res.send("Server error. Comment has not been created");
    }
  }
);

commentsRouter.patch(
  "/",
  async (req: Request<{}, {}, Partial<IComment>>, res: Response) => {
    try {
      let updateQuery = "UPDATE comments SET ";
      const valuesToUpdate = [];
      ["name", "body", "email"].forEach((fieldName) => {
        if (req.body.hasOwnProperty(fieldName)) {
          if (valuesToUpdate.length) {
            updateQuery += ", ";
          }

          updateQuery += `${fieldName} = ?`;
          valuesToUpdate.push(req.body[fieldName]);
        }
      });

      updateQuery += " WHERE comment_id = ?";
      valuesToUpdate.push(req.body.id);

      const [info] = await connection.query<ResultSetHeader>(
        updateQuery,
        valuesToUpdate
      );

      if (info.affectedRows === 1) {
        res.status(200);
        res.end();
        return;
      }

      const newComment = req.body as CommentCreatePayload;
      const validationResult = validateComment(newComment);

      if (validationResult) {
        res.status(400);
        res.send(validationResult);
        return;
      }

      const id = uuidv4();
      await connection.query<ResultSetHeader>(insertCommentQuery, [
        id,
        newComment.email,
        newComment.name,
        newComment.body,
        newComment.productId,
      ]);

      res.status(201);
      res.send({ ...newComment, id });
    } catch (e) {
      console.log(e.message);
      res.status(500);
      res.send("Server error");
    }
  }
);

commentsRouter.delete(
  "/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const [info] = await connection.query<ResultSetHeader>(
        "DELETE FROM comments WHERE comment_id = ?",
        [req.params.id]
      );

      if (info.affectedRows === 0) {
        res.status(404);
        res.send(`Comment with id ${req.params.id} is not found`);
        return;
      }

      res.status(200);
      res.end();
    } catch (e) {
      console.log(e.message);
      res.status(500);
      res.send("Server error. Comment has not been deleted");
    }
  }
);
