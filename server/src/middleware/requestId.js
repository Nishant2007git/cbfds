import { v4 as uuidv4 } from 'uuid';

const requestId = (req, res, next) => {
  const headerName = 'X-Request-Id';
  const id = req.headers[headerName.toLowerCase()] || uuidv4();
  req.id = id;
  res.setHeader(headerName, id);
  next();
};

export default requestId;
