import assert from "node:assert/strict";
import test from "node:test";

import {
  STORES,
  distanceBetweenMeters,
  evaluateStoreGeofence,
  parseGoogleMapsPin,
} from "../app/roster-domain.ts";

test("allows a precise location inside the fixed 10 metre boundary", () => {
  const store = STORES[0];
  const result = evaluateStoreGeofence(store, {
    latitude: store.latitude + 5 / 111_111,
    longitude: store.longitude,
    accuracyMeters: 5,
  });

  assert.equal(result.status, "Inside");
  assert.equal(result.allowed, true);
  assert.ok(result.distanceMeters < 10);
});

test("blocks a precise location outside the 10 metre boundary", () => {
  const store = STORES[0];
  const result = evaluateStoreGeofence(store, {
    latitude: store.latitude + 18 / 111_111,
    longitude: store.longitude,
    accuracyMeters: 5,
  });

  assert.equal(result.status, "Outside");
  assert.equal(result.allowed, false);
  assert.ok(result.distanceMeters > 10);
});

test("asks the employee to retry when GPS accuracy is weak", () => {
  const store = STORES[0];
  const result = evaluateStoreGeofence(store, {
    latitude: store.latitude,
    longitude: store.longitude,
    accuracyMeters: 40,
  });

  assert.equal(result.status, "Retry");
  assert.equal(result.allowed, false);
  assert.match(result.message, /Move near the store entrance and retry/);
});

test("parses coordinate pairs and full Google Maps URLs", () => {
  assert.deepEqual(parseGoogleMapsPin("12.971599, 77.594566"), {
    latitude: 12.971599,
    longitude: 77.594566,
  });
  assert.deepEqual(
    parseGoogleMapsPin(
      "https://www.google.com/maps/place/Boldfit/@12.935192,77.624481,18z",
    ),
    {
      latitude: 12.935192,
      longitude: 77.624481,
    },
  );
  assert.deepEqual(
    parseGoogleMapsPin(
      "https://www.google.com/maps/search/?api=1&query=13.035800%2C77.597000",
    ),
    {
      latitude: 13.0358,
      longitude: 77.597,
    },
  );
  assert.equal(parseGoogleMapsPin("not a location"), null);
  assert.equal(parseGoogleMapsPin("95, 181"), null);
});

test("uses the transferred employee's destination-store geofence", () => {
  const sourceStore = STORES[0];
  const destinationStore = STORES[1];
  const destinationPoint = {
    latitude: destinationStore.latitude,
    longitude: destinationStore.longitude,
    accuracyMeters: 4,
  };

  assert.equal(
    evaluateStoreGeofence(destinationStore, destinationPoint).allowed,
    true,
  );
  assert.equal(
    evaluateStoreGeofence(sourceStore, destinationPoint).allowed,
    false,
  );
  assert.ok(distanceBetweenMeters(sourceStore, destinationStore) > 1_000);
});
