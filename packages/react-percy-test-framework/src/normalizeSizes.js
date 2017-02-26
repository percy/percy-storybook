const splitDimensions = size => size
    .toLowerCase()
    .split('x')
    .map(n => n.trim())
    .splice(0, 2);

const toNumber = (num) => {
    if (typeof num === 'undefined') {
        return undefined;
    } else {
        return parseInt(num, 10);
    }
};

const isNotEmpty = Boolean;

export default function normalizeSizes(sizes = []) {
    return sizes
        .map((size) => {
            let width;
            let height;

            if (typeof size === 'number') {
                width = size;
            } else if (typeof size === 'string') {
                [width, height] = splitDimensions(size);
            } else if (typeof size === 'object') {
                width = size.width;
                height = size.height;
            }

            if (!width && !height) {
                return undefined;
            } else {
                return {
                    width: toNumber(width),
                    height: toNumber(height)
                };
            }
        })
        .filter(isNotEmpty);
}
