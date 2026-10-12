import { Router } from "express";
import { CreateCustomerController } from "./controllers/customer/createCustomerControllers";
import { DeleteCustomerController } from "./controllers/customer/deleteCustomerControllers";
import { GetClientByIdControllers } from "./controllers/customer/getCustomerByIdControllers";
import { GetCustomersControllers } from "./controllers/customer/getCustomersControllers";
import { UpdateCustomerController } from "./controllers/customer/updateCustomerControllers";
import { CreateOsControllers } from "./controllers/os/createOsControllers";
import { DeleteOsController } from "./controllers/os/deleteOsControllers";
import { GetAllOsByController } from "./controllers/os/getAllOsByClientControllers";
import { GetAllOsController } from "./controllers/os/getAllOsControllers";
import { GetOsByIdController } from "./controllers/os/getOsByIdControllers";
import { GetOsPdfController } from "./controllers/os/getOsPdfController";
import { UpdateOsControllers } from "./controllers/os/updateOsControlles";
import { authUserControllers } from "./controllers/user/authUserControllers";
import { ChangePasswordController } from "./controllers/user/changePasswordController";
import { CreateUserController } from "./controllers/user/createUserControllers";
import { detailUserController } from "./controllers/user/detailUserControllers";
import { ListUsersController } from "./controllers/user/listUsersController";
import { ResetUserPasswordController } from "./controllers/user/resetUserPasswordController";
import { UpdateUserController } from "./controllers/user/updateUserController";
import {
  isAuthenticated,
  isAuthenticatedPendingPassword,
} from "./middlewares/isAuthenticated";
import { requireAdmin } from "./middlewares/requireAdmin";

const router = Router();

router.get(
  "/users",
  isAuthenticated,
  requireAdmin,
  new ListUsersController().handle,
);
router.post(
  "/users",
  isAuthenticated,
  requireAdmin,
  new CreateUserController().handle,
);
router.put(
  "/users/:id",
  isAuthenticated,
  requireAdmin,
  new UpdateUserController().handle,
);
router.post(
  "/users/:id/reset-password",
  isAuthenticated,
  requireAdmin,
  new ResetUserPasswordController().handle,
);

router.post("/session", new authUserControllers().handle);

router.get(
  "/me",
  isAuthenticatedPendingPassword,
  new detailUserController().handle,
);
router.put(
  "/me/password",
  isAuthenticatedPendingPassword,
  new ChangePasswordController().handle,
);

router.post(
  "/customer",
  isAuthenticated,
  new CreateCustomerController().handle,
);

router.get(
  "/customer/:id",
  isAuthenticated,
  new GetClientByIdControllers().handle,
);
router.get("/customers", isAuthenticated, new GetCustomersControllers().handle);

router.delete(
  "/customer/:id",
  isAuthenticated,
  requireAdmin,
  new DeleteCustomerController().handle,
);

router.put(
  "/customer/:id",
  isAuthenticated,
  new UpdateCustomerController().handle,
);

router.get("/os", isAuthenticated, new GetAllOsController().handle);

router.get("/os/:id", isAuthenticated, new GetOsByIdController().handle);
router.get("/os/:id/pdf", isAuthenticated, new GetOsPdfController().handle);
router.get(
  "/os/client/:clientId",
  isAuthenticated,
  new GetAllOsByController().handle,
);

router.put("/os/:id", isAuthenticated, new UpdateOsControllers().handle);

router.post("/os", isAuthenticated, new CreateOsControllers().handle);
router.delete(
  "/os/:id",
  isAuthenticated,
  requireAdmin,
  new DeleteOsController().handle,
);
export { router };
