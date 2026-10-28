import { Alert } from '../../../components/Alert.jsx';

/** Tells the author what happened to location data once the server analyzed the file. */
export function GpsNotice({ gpsRemoved }) {
  if (gpsRemoved) {
    return (
      <Alert variant="success" className="mt-4">
        GPS data found and removed. The location will not be stored or published.
      </Alert>
    );
  }
  return (
    <Alert variant="info" className="mt-4">
      No GPS data found. Flash removes location data from every image before publishing it.
    </Alert>
  );
}
