import { baseApi } from "./baseApi";

export const uploadsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Sends multipart/form-data (field name "image"); the browser sets the
    // Content-Type + boundary automatically for FormData bodies.
    uploadImage: build.mutation<{ url: string }, FormData>({
      query: (body) => ({ url: "/uploads/image", method: "POST", body }),
    }),
  }),
});

export const { useUploadImageMutation } = uploadsApi;
