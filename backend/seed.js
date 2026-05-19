const mongoose = require('mongoose');
require('dotenv').config();
const Bus  = require('./models/Bus');
const User = require('./models/User');

const buses = [
  {
    busNumber: 'AP-1001', busType: 'express',
    source: 'Tirupati', destination: 'Chennai',
    departureTime: '06:00 AM', arrivalTime: '10:30 AM',
    basePrice: 320,
    stops: [
      { name: 'Chittoor',   arrivalTime: '07:15 AM', priceFromPrev: 80  },
      { name: 'Vellore',    arrivalTime: '08:45 AM', priceFromPrev: 120 },
      { name: 'Kanchipuram',arrivalTime: '09:45 AM', priceFromPrev: 80  },
    ],
  },
  {
    busNumber: 'AP-1002', busType: 'ac',
    source: 'Tirupati', destination: 'Hyderabad',
    departureTime: '08:00 PM', arrivalTime: '06:00 AM',
    basePrice: 650,
    stops: [
      { name: 'Kadapa',  arrivalTime: '10:00 PM', priceFromPrev: 180 },
      { name: 'Kurnool', arrivalTime: '01:00 AM', priceFromPrev: 220 },
      { name: 'Nandyal', arrivalTime: '11:30 PM', priceFromPrev: 140 },
    ],
  },
  {
    busNumber: 'AP-1003', busType: 'volvo',
    source: 'Tirupati', destination: 'Bangalore',
    departureTime: '09:00 PM', arrivalTime: '04:30 AM',
    basePrice: 500,
    stops: [
      { name: 'Chittoor',   arrivalTime: '10:00 PM', priceFromPrev: 100 },
      { name: 'Krishnagiri',arrivalTime: '12:30 AM', priceFromPrev: 200 },
      { name: 'Hosur',      arrivalTime: '02:00 AM', priceFromPrev: 130 },
    ],
  },
  {
    busNumber: 'AP-1004', busType: 'ordinary',
    source: 'Chennai', destination: 'Madurai',
    departureTime: '07:00 AM', arrivalTime: '01:00 PM',
    basePrice: 280,
    stops: [
      { name: 'Villupuram', arrivalTime: '09:00 AM', priceFromPrev: 90  },
      { name: 'Trichy',     arrivalTime: '11:00 AM', priceFromPrev: 110 },
    ],
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smartbus');
    console.log('✅ MongoDB connected');
    await Bus.deleteMany({});
    await User.deleteMany({});
    console.log('🗑️  Cleared data');

    for (const b of buses) {
      const bus = await Bus.create(b);
      const reversedStops = [...b.stops].reverse().map(s => ({
        name: s.name, arrivalTime: s.arrivalTime, priceFromPrev: s.priceFromPrev,
      }));
      await Bus.create({
        busNumber: `${b.busNumber}-R`, busType: b.busType,
        source: b.destination, destination: b.source,
        departureTime: b.arrivalTime, arrivalTime: b.departureTime,
        basePrice: b.basePrice, stops: reversedStops,
        isReturn: true, originalBusId: bus._id,
      });
    }
    console.log(`🚌 Seeded ${buses.length} routes + ${buses.length} return trips`);

    await User.create({ name: 'Admin', email: 'admin@smartbus.com', password: 'admin123', role: 'admin', provider: 'local' });
    await User.create({ name: 'Test User', email: 'user@smartbus.com', password: 'user123', role: 'user', provider: 'local' });
    console.log('👤 admin@smartbus.com / admin123  |  user@smartbus.com / user123');
    await mongoose.disconnect();
    console.log('✅ Done!');
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }
}
seed();
