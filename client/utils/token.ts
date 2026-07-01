export const saveToken = (token: string) => {
    localStorage.setItem("token", token);
};

export const getToken = () => {
    return localStorage.getItem("token");
};

export const removeToken = () => {
    localStorage.removeItem("token");
};

export const saveUser = (user: any) => {
    localStorage.setItem("user", JSON.stringify(user));
};

export const getUser = () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
};

export const removeUser = () => {
    localStorage.removeItem("user");
};