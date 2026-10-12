import "express-async-errors";
import cors from "cors";
import express from "express";
import { errorHandler } from "./middlewares/erroHandle";
import { router } from "./routers";

const app = express();
app.use(express.json());
app.use(cors());

app.use(router);
app.use(errorHandler);
const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server at running on ${PORT}`));
