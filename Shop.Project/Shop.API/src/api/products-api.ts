import { Request, Response, Router } from "express";
import { connection } from "../..";
import {
  ICommentEntity,
  ImagesRemovePayload,
  IProductEntity,
  IProductImageEntity,
  IProductSearchFilter,
  ProductAddImagesPayload,
  ProductCreatePayload,
} from "../../types";
import {
  mapCommentsEntity,
  mapImagesEntity,
  mapProductsEntity,
} from "../services/mapping";
import {
  enhanceProductsComments,
  enhanceProductsImages,
  getProductsFilterQuery,
} from "../helpers";
import { v4 as uuidv4 } from "uuid";
import { ResultSetHeader } from "mysql2";
import {
  deleteImagesQuery,
  insertProductImagesQuery,
  insertProductQuery,
} from "../services/queries";

export const productsRouter = Router();

const throwServerError = (res: Response, e: Error) => {
  console.debug(e.message);
  res.status(500);
  res.send("Something went wrong");
};

productsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const [productRows] = await connection.query<IProductEntity[]>(
      "SElECT * FROM products"
    );
    const [commentRows] = await connection.query<ICommentEntity[]>(
      "SELECT * FROM comments"
    );
    const [imageRows] = await connection.query<IProductImageEntity[]>(
      "SELECT * FROM images"
    );

    const products = mapProductsEntity(productRows);
    const withComments = enhanceProductsComments(products, commentRows);
    const withImages = enhanceProductsImages(withComments, imageRows);
    res.send(withImages);
  } catch (e) {
    throwServerError(res, e);
  }
});

productsRouter.get(
  "/search",
  async (req: Request<{}, {}, {}, IProductSearchFilter>, res: Response) => {
    try {
      const [query, values] = getProductsFilterQuery(req.query);
      const [rows] = await connection.query<IProductEntity[]>(query, values);

      if (!rows?.length) {
        res.status(404);
        res.send(`Products are not found`);
        return;
      }

      const [commentRows] = await connection.query<ICommentEntity[]>(
        "SELECT * FROM comments"
      );
      const [imageRows] = await connection.query<IProductImageEntity[]>(
        "SELECT * FROM images"
      );

      const products = mapProductsEntity(rows);
      const withComments = enhanceProductsComments(products, commentRows);
      const withImages = enhanceProductsImages(withComments, imageRows);
      res.send(withImages);
    } catch (e) {
      throwServerError(res, e);
    }
  }
);

productsRouter.get(
  "/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const [rows] = await connection.query<IProductEntity[]>(
        "SELECT * FROM products WHERE product_id = ?",
        [req.params.id]
      );

      if (!rows?.[0]) {
        res.status(404);
        res.send(`Product with id ${req.params.id} is not found`);
        return;
      }

      const [comments] = await connection.query<ICommentEntity[]>(
        "SELECT * FROM comments WHERE product_id = ?",
        [req.params.id]
      );

      const [images] = await connection.query<IProductImageEntity[]>(
        "SELECT * FROM images WHERE product_id = ?",
        [req.params.id]
      );

      const product = mapProductsEntity(rows)[0];

      if (comments.length) product.comments = mapCommentsEntity(comments);
      res.send(product);

      if (images.length) {
        product.images = mapImagesEntity(images);
        product.thumbnail =
          product.images.find((image) => image.main) || product.images[0];
      }

      res.send(product);
    } catch (e) {
      throwServerError(res, e);
    }
  }
);

productsRouter.post(
  "/",
  async (req: Request<{}, {}, ProductCreatePayload>, res: Response) => {
    try {
      const { title, description, price, images } = req.body;
      const productId = uuidv4();
      await connection.query<ResultSetHeader>(insertProductQuery, [
        productId,
        title || null,
        description || null,
        price || null,
      ]);

      if (images) {
        const values = images.map((image) => [
          uuidv4(),
          image.url,
          productId,
          image.main,
        ]);

        await connection.query<ResultSetHeader>(insertProductImagesQuery, [
          values,
        ]);
      }

      res.status(201);
      res.send(`Product id:${productId} has been added!`);
    } catch (e) {
      throwServerError(res, e);
    }
  }
);

productsRouter.delete(
  "/:id",
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const [rows] = await connection.query<IProductEntity[]>(
        "SELECT * FROM products WHERE product_id = ?",
        [req.params.id]
      );

      if (!rows?.[0]) {
        res.status(404);
        res.send(`Product with id ${req.params.id} is not found`);
        return;
      }

      await connection.query<ResultSetHeader>(
        "DELETE FROM images WHERE product_id = ?",
        [req.params.id]
      );

      await connection.query<ResultSetHeader>(
        "DELETE FROM comments WHERE product_id = ?",
        [req.params.id]
      );

      await connection.query<ResultSetHeader>(
        "DELETE FROM products WHERE product_id = ?",
        [req.params.id]
      );

      res.status(200);
      res.end();
    } catch (e) {
      throwServerError(res, e);
    }
  }
);

productsRouter.post(
  "/add-images",
  async (req: Request<{}, {}, ProductAddImagesPayload>, res: Response) => {
    try {
      const { productId, images } = req.body;
      if (!images?.length) {
        res.status(400);
        res.send("Images array is empty");
        return;
      }

      const values = images.map((image) => [
        uuidv4(),
        image.url,
        productId,
        image.main,
      ]);
      await connection.query<ResultSetHeader>(insertProductImagesQuery, [
        values,
      ]);

      res.status(201);
      res.send(`Images for a product id:${productId} have been added!`);
    } catch (e) {
      throwServerError(res, e);
    }
  }
);

productsRouter.post(
  "/remove-images",
  async (req: Request<{}, {}, ImagesRemovePayload>, res: Response) => {
    try {
      const imagesToRemove = req.body;
      if (!imagesToRemove?.length) {
        res.status(400);
        res.send("Images array is empty");
        return;
      }

      const [info] = await connection.query<ResultSetHeader>(
        deleteImagesQuery,
        [[imagesToRemove]]
      );

      if (info.affectedRows === 0) {
        res.status(404);
        res.send("No one image has been removed");
        return;
      }

      res.status(200);
      res.send(`Images have been removed!`);
    } catch (e) {
      throwServerError(res, e);
    }
  }
);
