import { UserRepository } from "./user.repository";
import { UpdateUserDTO } from "./user.types";
import { NotFoundError, ConflictError } from "@shared/AppError";
import { logger } from "@shared/logger";

const log = logger.child({ module: "UserService" });

export class UserService {
  constructor(private repo = new UserRepository()) {}

  async getUser(id: string) {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError("User");
    const { password, two_factor_secret, ...safeUser } = user as any;
    return safeUser;
  }

  async getAllUsers() {
    const users = await this.repo.findAll();
    return users.map(({ password, two_factor_secret, ...u }: any) => u);
  }

  async updateUser(id: string, data: UpdateUserDTO) {
    const user = await this.repo.update(id, data);
    if (!user) throw new NotFoundError("User");
    const { password, two_factor_secret, ...safeUser } = user as any;
    return safeUser;
  }

  async deleteUser(id: string) {
    const deleted = await this.repo.softDelete(id);
    if (!deleted) throw new NotFoundError("User");
    log.info({ userId: id }, "User deleted");
  }
}
