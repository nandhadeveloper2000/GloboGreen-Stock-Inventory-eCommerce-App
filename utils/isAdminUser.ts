export function isAdminUser(user: any): boolean {
  if (!user) return false;

  // common patterns (string role)
  const role = (user.role ?? user.userRole ?? user.type ?? "").toString().toUpperCase();

  if (role === "ADMIN" || role === "SUPER_ADMIN") return true;

  // common patterns (boolean)
  if (user.isAdmin === true) return true;

  // optional: allow admin emails list
  // if (user.email && ["globogreenmobile@gmail.com"].includes(user.email)) return true;

  return false;
}
