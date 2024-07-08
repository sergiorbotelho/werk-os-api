import { Router } from "express";
import { CreateUserController } from "./controllers/user/createUserControllers";
import { authUserControllers } from "./controllers/user/authUserControllers";
import { detailUserController } from "./controllers/user/detailUserControllers";
import { isAuthenticated } from "./middlewares/isAuthenticated";

const router = Router();

router.post("/users", new CreateUserController().handle);

router.post("/session", new authUserControllers().handle);

router.get("/me", isAuthenticated, new detailUserController().handle);

export { router };
