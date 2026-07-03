import { prisma } from "../../config/database";
import { BcryptUtils } from "../../utils/bcrypt";
import { JwtUtils, AuthPartyType } from "../../utils/jwt";

export const AuthService = {
  login: async (email: string, passwordPlain: string) => {
    const now = new Date();

    let user: any = null;
    let partyType: AuthPartyType = "STAFF";

    const staffUser = await prisma.staff.findUnique({ where: { email } });
    if (staffUser) {
      user = staffUser;
      partyType = "STAFF";
    } else {
      const customerUser = await prisma.customer.findUnique({
        where: { email },
      });
      if (customerUser) {
        user = customerUser;
        partyType = "CUSTOMER";
      }
    }

    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (user.status !== "ACTIVE") {
      throw new Error(
        `Authentication blocked. Account status is currently: ${user.status.toLowerCase()}`,
      );
    }

    const isPasswordValid = await BcryptUtils.compare(
      passwordPlain,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      const updatedCount = user.failedLoginCount + 1;
      let lockoutTime: Date | null = null;

      if (updatedCount >= 5) {
        lockoutTime = new Date(now.getTime() + 15 * 60000);
      }

      if (partyType === "STAFF") {
        await prisma.staff.update({
          where: { id: user.id },
          data: { failedLoginCount: updatedCount, lockedUntil: lockoutTime },
        });
      } else {
        await prisma.customer.update({
          where: { id: user.id },
          data: { failedLoginCount: updatedCount, lockedUntil: lockoutTime },
        });
      }

      if (updatedCount >= 5) {
        throw new Error(
          "Account has been temporarily locked due to 5 failed login attempts.",
        );
      }

      throw new Error("Invalid email or password");
    }

    if (user.failedLoginCount > 0 || user.lockedUntil) {
      if (partyType === "STAFF") {
        await prisma.staff.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null },
        });
      } else {
        await prisma.customer.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null },
        });
      }
    }

    const isStaff = partyType === "STAFF";
    const accessToken = JwtUtils.generateAccessToken({
      userId: user.id,
      email: user.email,
      partyType,
      isSAdmin: isStaff ? user.isSAdmin : false,
      isManager: isStaff ? user.isManager : false,
      isPSsupport: isStaff ? user.isPSsupport : false,
    });

    const refreshToken = JwtUtils.generateRefreshToken(user.id, partyType);

    return { accessToken, refreshToken, partyType };
  },
};
