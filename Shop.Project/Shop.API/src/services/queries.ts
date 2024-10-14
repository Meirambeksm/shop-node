export const findDuplicateQuery = `
        SELECT * FROM comments c
        WHERE LOWER(c.email) = ?
        AND LOWER(c.name) = ?
        AND LOWER(c.body) = ?
        AND c.product_id = ?
`;

export const insertCommentQuery = `
        INSERT INTO comments
        (comment_id, email, name, body, product_id)
        VALUES
        (?, ?, ?, ?, ?)
`;

export const insertProductQuery = `
        INSERT INTO products
        (product_id, title, description, price)
        VALUES
        (?, ?, ?, ?)
`;

export const insertProductImagesQuery = `
        INSERT INTO images
        (image_id, url, product_id, main)
        VALUES ?
`;

export const deleteImagesQuery = `
        DELETE FROM images
        WHERE image_id IN ?;
`;
