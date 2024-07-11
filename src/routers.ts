import { Router } from "express";
import { CreateUserController } from "./controllers/user/createUserControllers";
import { authUserControllers } from "./controllers/user/authUserControllers";
import { detailUserController } from "./controllers/user/detailUserControllers";
import { isAuthenticated } from "./middlewares/isAuthenticated";
import { createClientController } from "./controllers/client/createClientControllers";

const router = Router();

router.post("/users", new CreateUserController().handle);

router.post("/session", new authUserControllers().handle);

router.get("/me", isAuthenticated, new detailUserController().handle);

router.post("/client", isAuthenticated, new createClientController().handle);

export { router };
