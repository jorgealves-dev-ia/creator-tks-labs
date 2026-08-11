/**
 * What travels on a drag from the Inputs shelf to the canvas.
 *
 * A custom MIME type rather than `text/plain`, for one reason: dropping text
 * from anywhere else — a word from a document, a link from another tab — would
 * otherwise arrive looking exactly like a request to create a node. Naming the
 * format is what makes the canvas able to ignore everything that is not ours.
 *
 * Lives in its own module because both ends need it and neither should import
 * the other: the rail is a component of the studio and the canvas is a
 * component of the studio, and a constant is not a reason for one to depend on
 * the other.
 */
export const NODE_TYPE_MIME = "application/x-creatortks-node";
