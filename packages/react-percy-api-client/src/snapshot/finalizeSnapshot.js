export default function finalizeSnapshot(percyClient, snapshot) {
  return new Promise((resolve, reject) => {
    percyClient
      .finalizeSnapshot(snapshot.id)
      .then(() => resolve(), err => reject(err.response.body));
  });
}
