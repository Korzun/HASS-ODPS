import { createApp } from './app';

const app = createApp();
const port = parseInt(process.env.PORT ?? '3000', 10);

app.listen(port, () => {
  console.log(`HASS-ODPS running on port ${port}`);
});
