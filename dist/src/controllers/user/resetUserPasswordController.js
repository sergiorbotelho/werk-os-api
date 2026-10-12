"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResetUserPasswordController = void 0;
const common_1 = require("../../schemas/common");
const resetUserPasswordService_1 = require("../../services/user/resetUserPasswordService");
class ResetUserPasswordController {
    handle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = yield common_1.uuidParamSchema.parseAsync(req.params.id);
            const resetUserPasswordService = new resetUserPasswordService_1.ResetUserPasswordService();
            const result = yield resetUserPasswordService.execute({
                id,
                actorId: req.user_id,
            });
            return res.status(200).json(result);
        });
    }
}
exports.ResetUserPasswordController = ResetUserPasswordController;
