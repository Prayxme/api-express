const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
// app.use(express.json())
app.use(cors());

// Conexión a la base de datos
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/User';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Conectado a la base de datos exitosamente'))
  .catch((err) => {
    console.error('Error al conectar con la base de datos:', err.message);
    process.exit(1);
  });


const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const users = mongoose.model('User', userSchema);

// Middleware de autenticación
const verifyToken = (req, res, next) => {
  let token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ message: 'Token requerido' });
  }

  // Eliminar el prefijo "Bearer " si está presente
  if (token.startsWith('Bearer ')) {
    token = token.slice(7, token.length); // Remueve "Bearer " (7 caracteres)
  }

  try {
    console.log('Token recibido:', token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decodificado:', decoded);
    req.user = decoded; 
    next();
  } catch (error) {
    console.error('Error al verificar el token:', error.message);
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

app.post('/users', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'El nombre de usuario y la contraseña son obligatorios' });
  }

  try {
    // Verificar si el nombre de usuario ya existe
    const userExiste = await users.findOne({ username });
    if (userExiste) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Crear un nuevo usuario
    const newUser = new users({ username, password });
    await newUser.save();

    res.status(201).json({ message: 'Usuario creado', usuario: newUser });
  } catch (err) {
    console.error('Error al crear el usuario:', err.message);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
});


app.get('/users', async (req, res) => {
  try {
    const usuarios = await users.find();
    res.json(usuarios);
  } catch (err) {
    console.error('Error al obtener usuarios:', err.message);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Ruta de login
app.post('/auth/login', async (req, res) => {
  console.log('Request body:', req.body); 
  const { username, password } = req.body;

  try {
    const user = await users.findOne({ username });

    console.log('Usuario encontrado:', user);
    console.log('contraseña', password)

    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Credenciales Invalidas' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1m',
    });
    console.log('Token generado:', token);

    res.json({ message: 'Inicio de Sesion correcto', token });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

//dashboard
app.get('/dashboard', verifyToken, (req, res) => {
  res.json({ message: 'Bienvenido al dashboard' });
});

app.get('/detail/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  res.json({ message: `Details for item ${id}` });
});

app.listen(PORT, () => {
  console.log(`Server corriendo en http://localhost:${PORT}`);
});
