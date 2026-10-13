import { raw, Router } from "express";
import { UpdateProfileController } from "./controllers/user/updateProfileController";
import { CreateBackupController } from "./controllers/backup/createBackupController";
import { GetBackupStatusController } from "./controllers/backup/getBackupStatusController";
import { RestoreBackupController } from "./controllers/backup/restoreBackupController";
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
import { DeleteAvatarController } from "./controllers/user/deleteAvatarController";
import { detailUserController } from "./controllers/user/detailUserControllers";
import { GetAvatarController } from "./controllers/user/getAvatarController";
import { ListUsersController } from "./controllers/user/listUsersController";
import { ResetUserPasswordController } from "./controllers/user/resetUserPasswordController";
import { UpdateUserController } from "./controllers/user/updateUserController";
import { UploadAvatarController } from "./controllers/user/uploadAvatarController";
import {
  isAuthenticated,
  isAuthenticatedPendingPassword,
} from "./middlewares/isAuthenticated";
import { BACKUP_MAX_BYTES } from "./lib/backupFile";
import { requireAdmin } from "./middlewares/requireAdmin";
import { backupMimeTypes } from "./schemas/backup";
import { avatarMimeTypes } from "./schemas/user";

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
router.get(
  "/users/:id/avatar",
  isAuthenticated,
  new GetAvatarController().handle,
);
router.get(
  "/backup/status",
  isAuthenticated,
  requireAdmin,
  new GetBackupStatusController().handle,
);
router.post(
  "/backup",
  isAuthenticated,
  requireAdmin,
  new CreateBackupController().handle,
);
// Corpo cru só nesta rota, e só depois de confirmar que é admin
router.post(
  "/backup/restore",
  isAuthenticated,
  requireAdmin,
  raw({ type: [...backupMimeTypes], limit: BACKUP_MAX_BYTES }),
  new RestoreBackupController().handle,
);

router.post("/session", new authUserControllers().handle);

router.get(
  "/me",
  isAuthenticatedPendingPassword,
  new detailUserController().handle,
);
router.put("/me", isAuthenticated, new UpdateProfileController().handle);
router.put(
  "/me/password",
  isAuthenticatedPendingPassword,
  new ChangePasswordController().handle,
);
// Corpo cru só nesta rota; o express.json global continua com 100 KB
router.put(
  "/me/avatar",
  isAuthenticated,
  raw({ type: [...avatarMimeTypes], limit: "1mb" }),
  new UploadAvatarController().handle,
);
router.delete("/me/avatar", isAuthenticated, new DeleteAvatarController().handle);

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
