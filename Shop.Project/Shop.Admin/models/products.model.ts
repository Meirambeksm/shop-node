import axios from "axios";
import { IProduct, IProductFilterPayload } from "@Shared/types";

const host = `http://${process.env.LOCAL_HOST}:${process.env.LOCAL_PORT}/${process.env.API_PATH}`;

export async function getProducts(): Promise<IProduct[]> {
  const { data } = await axios.get<IProduct[]>(`${host}/products`);
  return data || [];
}

export async function searchProducts(
  filter: IProductFilterPayload
): Promise<IProduct[]> {
  const { data } = await axios.get<IProduct[]>(`${host}/products/search`, {
    params: filter,
  });
  return data || [];
}

export async function getProduct(id: string): Promise<IProduct | null> {
  try {
    const { data } = await axios.get(`${host}/products/${id}`);
    return data;
  } catch (e) {
    return null;
  }
}
