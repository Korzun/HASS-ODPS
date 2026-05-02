export const book = (bookId: string) => `/book/${bookId}`;
export const bookEdit = (bookId: string) => `/book/${bookId}/edit`;
export const library = () => '/';
export const login = () => '/login';
export const series = (seriesName: string) => `/series/${seriesName}`;
export const userList = () => '/users';

// Server
export const cover = (bookId: string) => `/api/books/${bookId}/cover`;
