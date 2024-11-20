import express, { NextFunction, Request, Response } from "express";
require("express-async-errors");
import cors from "cors";
import { router } from "./routers";
import { errorHandler } from "./middlewares/erroHandle";

const app = express();
app.use(express.json());
app.use(cors());

app.use(router);
app.use(errorHandler);
app.listen(3333, () => console.log("Server at running..."));
