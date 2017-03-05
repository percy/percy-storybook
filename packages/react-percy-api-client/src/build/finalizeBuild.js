export default function finalizeBuild(percyClient, build) {
    return new Promise((resolve, reject) => {
        percyClient.finalizeBuild(build.id)
            .then(
                () => resolve(),
                err => reject(err.response.body)
            );
    });
}
