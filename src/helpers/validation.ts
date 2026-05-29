import validator from "validator";

export const checkIdIsValid = (id: string) => validator.isUUID(id);
