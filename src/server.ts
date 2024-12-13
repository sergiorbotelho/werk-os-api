import cors from "cors";
import express from "express";
import { errorHandler } from "./middlewares/erroHandle";
import { router } from "./routers";
require("express-async-errors");

const app = express();
app.use(express.json());
app.use(cors());

app.use(router);
app.use(errorHandler);
const PORT = process.env.PORT || 3333;
app.listen(3333, () => console.log(`Server at running on ${PORT}`));
