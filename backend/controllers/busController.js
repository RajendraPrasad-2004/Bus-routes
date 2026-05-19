const Bus = require('../models/Bus');

// Bus type price multipliers
const TYPE_MULTIPLIER = {
  ordinary: 1.0,
  express:  1.2,
  ac:       1.5,
  sleeper:  1.8,
  volvo:    2.0,
};

// Build full route with cumulative prices
const getFullRoute = (bus) => {
  const route = [{ name: bus.source, arrivalTime: bus.departureTime, cumulativePrice: 0 }];
  let cum = 0;
  for (const s of bus.stops) {
    cum += s.priceFromPrev || 0;
    route.push({ name: s.name, arrivalTime: s.arrivalTime, cumulativePrice: cum });
  }
  route.push({ name: bus.destination, arrivalTime: bus.arrivalTime, cumulativePrice: bus.basePrice });
  return route;
};

// Calculate ticket price between two stops on the route
const calcSegmentPrice = (bus, fromIdx, toIdx, route) => {
  const totalStops = route.length - 1; // number of segments
  if (totalStops === 0) return bus.basePrice;

  const fromPrice = route[fromIdx].cumulativePrice;
  const toPrice   = route[toIdx].cumulativePrice;
  // If per-stop prices are set, use the difference; else prorate by segment count
  const hasPerStopPricing = bus.stops.some(s => (s.priceFromPrev || 0) > 0);
  if (hasPerStopPricing) {
    return Math.round(toPrice - fromPrice);
  }
  // Prorate: segments covered / total segments * basePrice
  const segmentsCovered = toIdx - fromIdx;
  return Math.round((segmentsCovered / totalStops) * bus.basePrice);
};

// Match bus for a from→to journey and compute ticket price
const matchesRoute = (bus, from, to) => {
  const route = getFullRoute(bus);
  console.log(route);
  const fromIdx = route.findIndex(s => s?.name && s.name.match(new RegExp(`^${from}$`, 'i')));
  
  const toIdx   = route.findIndex(s => s?.name && s.name.match(new RegExp(`^${to}$`, 'i')));
  if (fromIdx === -1 || toIdx === -1 || fromIdx >= toIdx) return null;

  const price = calcSegmentPrice(bus, fromIdx, toIdx, route);
  const multiplier = TYPE_MULTIPLIER[bus.busType] || 1.0;

  return {
    boardingStop:  route[fromIdx].name,
    boardingTime:  route[fromIdx].arrivalTime,
    alightingStop: route[toIdx].name,
    alightingTime: route[toIdx].arrivalTime,
    routeSegment:  route.slice(fromIdx, toIdx + 1),
    ticketPrice:   Math.round(price * multiplier),
    basePrice:     bus.basePrice,
    busType:       bus.busType,
    multiplier,
  };
};

// GET /buses
const getAllBuses = async (req, res, next) => {
  try {
    const buses = await Bus.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: buses.length, data: buses });
  } catch (err) { next(err); }
};

// GET /buses/search?source=&destination=
const searchBuses = async (req, res, next) => {
  try {
    const { source, destination } = req.query;
    if (!source || !destination)
      return res.status(400).json({ success: false, message: 'Source and destination are required' });

    const allBuses = await Bus.find();
    const outbound = [], returnBuses = [];

    for (const bus of allBuses) {
      const fwd = matchesRoute(bus, source.trim(), destination.trim());
      if (fwd) outbound.push({ ...bus.toJSON(), matchInfo: fwd });

      const rev = matchesRoute(bus, destination.trim(), source.trim());
      if (rev) returnBuses.push({ ...bus.toJSON(), matchInfo: rev });
    }

    res.status(200).json({ success: true, outbound, return: returnBuses });
  } catch (err) { next(err); }
};

// POST /buses/add  (admin only)
const addBus = async (req, res, next) => {
  try {
    const { busNumber, source, destination, departureTime, arrivalTime, basePrice, busType, stops } = req.body;

    if (!busNumber || !source || !destination || !departureTime || !arrivalTime || basePrice == null)
      return res.status(400).json({
        success: false,
        message: 'busNumber, source, destination, departureTime, arrivalTime and basePrice are required',
      });

    const parsedStops = (stops || [])
      .map(s => ({
        name:          typeof s === 'string' ? s : s.name,
        arrivalTime:   typeof s === 'string' ? '' : (s.arrivalTime || ''),
        priceFromPrev: typeof s === 'string' ? 0 : Number(s.priceFromPrev || 0),
      }))
      .filter(s => s.name.trim());

    const bus = await Bus.create({
      busNumber, source, destination, departureTime, arrivalTime,
      basePrice: Number(basePrice),
      busType: busType || 'ordinary',
      stops: parsedStops,
    });

    // Auto-create return trip with reversed stops
    const reversedStops = [...parsedStops].reverse().map(s => ({
      name:          s.name,
      arrivalTime:   s.arrivalTime,
      priceFromPrev: s.priceFromPrev,
    }));

    await Bus.create({
      busNumber:     `${busNumber}-R`,
      source:        destination,
      destination:   source,
      departureTime: arrivalTime,
      arrivalTime:   departureTime,
      basePrice:     Number(basePrice),
      busType:       busType || 'ordinary',
      stops:         reversedStops,
      isReturn:      true,
      originalBusId: bus._id,
    });

    res.status(201).json({ success: true, data: bus, message: 'Bus and return trip created' });
  } catch (err) { next(err); }
};

// DELETE /buses/:id  (admin only)
const deleteBus = async (req, res, next) => {
  try {
    const bus = await Bus.findByIdAndDelete(req.params.id);
    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });
    if (!bus.isReturn) await Bus.deleteOne({ originalBusId: bus._id, isReturn: true });
    res.status(200).json({ success: true, message: 'Bus deleted successfully' });
  } catch (err) { next(err); }
};

module.exports = { getAllBuses, searchBuses, addBus, deleteBus };
