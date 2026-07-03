export const saveToken = (token: string) => {
  localStorage.setItem("token", token);
};

export const getToken = () => {
  return localStorage.getItem("token");
};

<<<<<<< HEAD
export const saveUser = (user: any) => {
  localStorage.setItem("user", JSON.stringify(user));
=======
export const saveUser = (user: object) => {
    localStorage.setItem("user", JSON.stringify(user));
>>>>>>> 5bad46d09911a7c1a88cc5fbc35715db6c15ed67
};

export const getUser = () => {
  const user = localStorage.getItem("user");

  return user ? JSON.parse(user) : null;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};