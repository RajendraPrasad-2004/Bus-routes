const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    arrivalTime: { type: String, required: true },
    // Price from the PREVIOUS stop (or source) to this stop
    priceFromPrev: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const busSchema = new mongoose.Schema(
  {
    busNumber:     { type: String, required: [true, 'Bus number is required'], trim: true },
    source:        { type: String, required: [true, 'Source is required'], trim: true },
    destination:   { type: String, required: [true, 'Destination is required'], trim: true },
    departureTime: { type: String, required: [true, 'Departure time is required'] },
    arrivalTime:   { type: String, required: [true, 'Arrival time is required'] },
    // Base full-route price (source → destination)
    basePrice:     { type: Number, required: [true, 'Base price is required'], min: 0 },
    // Bus class/type affects pricing
    busType:       { type: String, enum: ['ordinary', 'express', 'ac', 'sleeper', 'volvo'], default: 'ordinary' },
    stops:         { type: [stopSchema], default: [] },
    isReturn:      { type: Boolean, default: false },
    originalBusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', default: null },
  },
  { timestamps: true }
);

// Virtual: ordered full route with cumulative price from source
busSchema.virtual('fullRoute').get(function () {
  const route = [{ name: this.source, arrivalTime: this.departureTime, cumulativePrice: 0 }];
  let cumulative = 0;
  for (const s of this.stops) {
    cumulative += s.priceFromPrev || 0;
    route.push({ name: s.name, arrivalTime: s.arrivalTime, cumulativePrice: cumulative });
  }
  route.push({ name: this.destination, arrivalTime: this.arrivalTime, cumulativePrice: this.basePrice });
  return route;
});

busSchema.set('toJSON', { virtuals: true });
busSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Bus', busSchema);
