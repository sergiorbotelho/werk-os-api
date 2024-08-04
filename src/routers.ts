import { Router } from "express";
import { CreateUserController } from "./controllers/user/createUserControllers";
import { authUserControllers } from "./controllers/user/authUserControllers";
import { detailUserController } from "./controllers/user/detailUserControllers";
import { isAuthenticated } from "./middlewares/isAuthenticated";
import { CreateClientController } from "./controllers/client/createClientControllers";
import { CreateOsControllers } from "./controllers/os/createOsControllers";
import { GetCustomersControllers } from "./controllers/client/getCustomersControllers";
import { GetClientByNameControllers } from "./controllers/client/getClientByNameControllers";

const router = Router();

router.post("/users", new CreateUserController().handle);

router.post("/session", new authUserControllers().handle);

router.get("/me", isAuthenticated, new detailUserController().handle);

router.post("/client", isAuthenticated, new CreateClientController().handle);

router.get(
  "/client/:name",
  isAuthenticated,
  new GetClientByNameControllers().handle
);

router.get("/customers", isAuthenticated, new GetCustomersControllers().handle);

router.post("/os", isAuthenticated, new CreateOsControllers().handle);

export { router };
