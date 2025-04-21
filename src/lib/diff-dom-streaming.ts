import debug from "debug";

const log = debug("dds");

type NodePath = {
    node: Node;
    parent: NodePath | null;
};

function formatNodePath(path: NodePath): string {
    const parts: string[] = [];
    let current: NodePath | null = path;
    while (current) {
        let nodeName = current.node.nodeName.toLowerCase();
        if (current.node instanceof Element && current.node.classList.length > 0) {
            nodeName += `.${Array.from(current.node.classList).join(".")}`;
        }
        parts.unshift(nodeName);
        current = current.parent;
    }
    return `[` + parts.join(" > ") + `]`;
}

type Walker = {
    // Root node of the parsed HTML
    root: Node | null;
    // Function to get the first child of a node (respecting options)
    firstChild: (node: Node, path: NodePath) => [Node | null, NodePath | null];
    // Function to get the next sibling of a node (respecting options)
    nextSibling: (node: Node, path: NodePath) => [Node | null, NodePath | null];
    // Options for the walker
    options: Options;
};

type Options = {
    // Passed a node from the "target" document, returns true if the node should be preserved,
    // ie it won't be removed even if it's not present in the new document.
    //
    // This is useful for preserving dynamically inserted nodes: anything injected by bundlers
    // in development, anything rendered client-side using svelte, etc.
    //
    // Also, anything that's randomly-generated (like "check out this article"), probably should be
    // preserved to avoid layout shifts.
    shouldPreserveNode?: (node: Node) => boolean;
};

// DOM node type constants for better readability and performance
const ELEMENT_TYPE = 1;
const ATTRIBUTE_TYPE = 2;
const TEXT_TYPE = 3;
const CDATA_SECTION_TYPE = 4;
const ENTITY_REFERENCE_TYPE = 5;
const ENTITY_TYPE = 6;
const PROCESSING_INSTRUCTION_TYPE = 7;
const COMMENT_TYPE = 8;
const DOCUMENT_TYPE = 9;
const DOCUMENT_FRAGMENT_TYPE = 11;
const NOTATION_TYPE = 12;

function formatNodeType(nodeType: number): string {
    switch (nodeType) {
        case ELEMENT_TYPE:
            return "Element";
        case ATTRIBUTE_TYPE:
            return "Attribute";
        case TEXT_TYPE:
            return "Text";
        case CDATA_SECTION_TYPE:
            return "CDATA Section";
        case ENTITY_REFERENCE_TYPE:
            return "Entity Reference";
        case ENTITY_TYPE:
            return "Entity";
        case PROCESSING_INSTRUCTION_TYPE:
            return "Processing Instruction";
        case COMMENT_TYPE:
            return "Comment";
        case DOCUMENT_TYPE:
            return "Document";
        case DOCUMENT_FRAGMENT_TYPE:
            return "Document Fragment";
        case NOTATION_TYPE:
            return "Notation";
        default:
            return `Unknown (${nodeType})`;
    }
}

function extractNodeContents(node: Node): string {
    if (node instanceof Element) {
        return node.outerHTML;
    } else {
        return node.textContent || "";
    }
}

function formatNodeContents(contents: string): string {
    if (contents.length === 0) {
        return "(empty)";
    }
    if (contents.trim().length === 0) {
        return "(only whitespace)";
    }
    if (contents.length <= 120) {
        return contents;
    }
    const start = contents.slice(0, 60);
    const end = contents.slice(-60);
    const omitted = contents.length - 120;
    return `${start}...${end} (${omitted} characters omitted)`;
}

function logNodeContents(node: Node, message: string, path: NodePath) {
    log(
        `${message} Node: ${node.nodeName}, Type: ${formatNodeType(node.nodeType)}, Path: ${formatNodePath(path)}, Contents: ${formatNodeContents(extractNodeContents(node))}`,
    );
}

function compareNodeContents(oldNode: Node, newNode: Node): string {
    const oldContents = extractNodeContents(oldNode);
    const newContents = extractNodeContents(newNode);

    if (oldContents === newContents) {
        return `Both nodes have the same contents: ${formatNodeContents(oldContents)}`;
    } else {
        return `Old node (${formatNodeType(oldNode.nodeType)}): ${formatNodeContents(oldContents)}\nNew node (${formatNodeType(newNode.nodeType)}): ${formatNodeContents(newContents)}`;
    }
}

export default function diff(oldNode: Node, html: string, options: Options) {
    log("Starting HTML processing");
    const walker = htmlWalker(html, options);
    const newNode = walker.root!;
    if (oldNode.nodeType === DOCUMENT_TYPE) {
        oldNode = (oldNode as Document).documentElement;
    }

    const rootPath: NodePath = { node: oldNode, parent: null };

    if (newNode.nodeType === DOCUMENT_FRAGMENT_TYPE) {
        setChildNodes(oldNode, newNode, walker, rootPath, options);
    } else {
        updateNode(oldNode, newNode, walker, rootPath, options);
    }
}

/**
 * Updates a specific htmlNode and does whatever it takes to convert it to another one.
 * Handles different node types and applies appropriate updates.
 * This function does recurse into children nodes for element nodes, but not for other node types.
 *
 * The process of this function is as follows:
 * 1. Check if the node should be preserved based on the options.
 * 2. Compare the node types of the old and new nodes.
 *    - If they don't match, replace the entire old node with the new one.
 * 3. For element nodes:
 *    - Update child nodes recursively.
 *    - Compare node names (tags).
 *      - If they match, update attributes (except for BODY elements).
 *      - If they don't match, replace the node but preserve its children.
 * 4. For text or comment nodes:
 *    - Update the node value if it has changed.
 */
function updateNode(
    oldNode: Node,
    newNode: Node,
    walker: Walker,
    path: NodePath,
    options?: Options,
) {
    // If node types don't match, we need to handle differently based on preservation
    if (oldNode.nodeType !== newNode.nodeType) {
        if (options?.shouldPreserveNode?.(oldNode)) {
            log(
                `Preserving old node and appending new node. Old type: ${formatNodeType(oldNode.nodeType)}, New type: ${formatNodeType(newNode.nodeType)}, Node: ${oldNode.nodeName}, Path: ${formatNodePath(path)}`,
            );
            log(compareNodeContents(oldNode, newNode));
            log(`Full path to node: ${formatNodePath(path)}`);
            oldNode.parentNode!.appendChild(newNode.cloneNode(true));
        } else {
            log(
                `Replacing node due to type mismatch. Old type: ${formatNodeType(oldNode.nodeType)}, New type: ${formatNodeType(newNode.nodeType)}, Node: ${oldNode.nodeName}, Path: ${formatNodePath(path)}`,
            );
            log(compareNodeContents(oldNode, newNode));
            log(`Full path to node: ${formatNodePath(path)}`);
            oldNode.parentNode!.replaceChild(newNode.cloneNode(true), oldNode);
        }
        return;
    }

    // Element nodes need their children and attributes updated
    if (oldNode.nodeType === ELEMENT_TYPE) {
        // First update children to ensure proper nesting
        setChildNodes(oldNode, newNode, walker, path, options);

        if (oldNode.nodeName === newNode.nodeName) {
            // Skip attribute updates on BODY to preserve event handlers
            if (newNode.nodeName !== "BODY") {
                setAttributes(
                    (oldNode as Element).attributes,
                    (newNode as Element).attributes,
                    path,
                );
            }
        } else {
            log(
                `Replacing node due to tag name mismatch. Old: ${oldNode.nodeName}, New: ${newNode.nodeName}, Path: ${formatNodePath(path)}`,
            );
            log(compareNodeContents(oldNode, newNode));
            log(`Full path to node: ${formatNodePath(path)}`);
            // If tag names don't match, we need to replace the node but keep its children
            const hasDocumentFragmentInside = newNode.nodeName === "TEMPLATE";
            // Clone the new node, preserving content for templates
            const clonedNewNode = newNode.cloneNode(hasDocumentFragmentInside);
            // Move all children from old node to new node to preserve event handlers, etc.
            while (oldNode.firstChild) clonedNewNode.appendChild(oldNode.firstChild);
            // Replace the old node with the new one
            oldNode.parentNode!.replaceChild(clonedNewNode, oldNode);
        }
    } else if (oldNode.nodeValue !== newNode.nodeValue) {
        // For text/comment nodes, just update the value
        log(
            `Updating node value for node type: ${formatNodeType(oldNode.nodeType)}, Path: ${formatNodePath(path)}`,
        );
        log(compareNodeContents(oldNode, newNode));
        log(`Full path to node: ${formatNodePath(path)}`);
        oldNode.nodeValue = newNode.nodeValue;
    }
}

/**
 * Utility that will update one list of attributes to match another.
 * Handles both removing old attributes and adding/updating new ones.
 */
function setAttributes(oldAttributes: NamedNodeMap, newAttributes: NamedNodeMap, path: NodePath) {
    // Variables for iterating through attributes
    let i, oldAttribute, newAttribute, namespace, name;

    // Remove old attributes that don't exist in the new node
    for (i = oldAttributes.length; i--; ) {
        oldAttribute = oldAttributes[i];
        namespace = oldAttribute.namespaceURI;
        name = oldAttribute.localName;
        // Check if this attribute exists in the new node
        newAttribute = newAttributes.getNamedItemNS(namespace, name);

        // Remove attribute if it doesn't exist in the new node
        if (!newAttribute) {
            log(`Removing attribute: ${name}, Path: ${formatNodePath(path)}`);
            oldAttributes.removeNamedItemNS(namespace, name);
        }
    }

    // Set new attributes or update existing ones
    for (i = newAttributes.length; i--; ) {
        oldAttribute = newAttributes[i];
        namespace = oldAttribute.namespaceURI;
        name = oldAttribute.localName;
        // Check if this attribute exists in the old node
        newAttribute = oldAttributes.getNamedItemNS(namespace, name);

        // Preserve server actions to prevent duplicate registrations
        if (oldAttribute.name === "data-action") continue;

        if (!newAttribute) {
            // Add new attribute to the old node
            // First remove from source to avoid DOM ownership issues
            log(
                `Adding new attribute: ${name}, Value: ${oldAttribute.value}, Path: ${formatNodePath(path)}`,
            );
            newAttributes.removeNamedItemNS(namespace, name);
            oldAttributes.setNamedItemNS(oldAttribute);
        } else if (newAttribute.value !== oldAttribute.value) {
            // Update existing attribute value
            log(
                `Updating attribute value: ${name}, Old: ${newAttribute.value}, New: ${oldAttribute.value}, Path: ${formatNodePath(path)}`,
            );
            newAttribute.value = oldAttribute.value;
        }
    }
}

/**
 * Utility that will update children nodes to match another node's children.
 * Uses a keyed diffing algorithm for optimal node reuse.
 *
 * @param oldParent - The target node we're mutating. This is the actual DOM element being updated.
 * @param newParent - The reference markup that we parsed. It represents what we're trying to turn oldParent into.
 * @param walker - A utility object for traversing the parsed HTML structure.
 * @param parentPath - The path to the current parent node in the DOM tree.
 * @param options - Optional configuration for the diffing process.
 */
function setChildNodes(
    oldParent: Node,
    newParent: Node,
    walker: Walker,
    parentPath: NodePath,
    options?: Options,
) {
    // Temporary variable to check old nodes
    let checkOld;
    // Keys for mapping between old and new nodes
    let oldKey;
    let newKey;
    // Node found during keyed diffing
    let foundNode;
    // Map of keyed nodes for efficient lookup
    let keyedNodes: Record<string, Node> | null = null;
    // Starting point for traversal - first child of each parent
    let [oldNode, oldPath] = walker.firstChild(oldParent, parentPath);
    let [newNode, newPath] = walker.firstChild(newParent, { node: newParent, parent: null });
    // Counter for tracking nodes that need to be removed later
    let extra = 0;

    // First pass: extract keyed nodes from previous children and count total nodes
    while (oldNode) {
        extra++; // Increment count of old nodes
        checkOld = oldNode;
        oldKey = getKey(checkOld);
        [oldNode, oldPath] = walker.nextSibling(oldNode, oldPath!);

        // Store keyed nodes in a map for efficient lookup
        if (oldKey) {
            if (!keyedNodes) keyedNodes = {}; // Initialize map on first key found
            keyedNodes[oldKey] = checkOld;
        }
    }

    // Reset for the second pass
    [oldNode, oldPath] = walker.firstChild(oldParent, parentPath);

    // Second pass: Loop over new nodes and perform updates
    while (newNode) {
        // Track if we inserted a new node vs updating existing
        let insertedNode;

        // Case 1: Keyed node matching - most efficient path
        if (keyedNodes && (newKey = getKey(newNode)) && (foundNode = keyedNodes[newKey])) {
            // Remove from keyed map since we're using this node
            delete keyedNodes[newKey];
            // Move the node if it's not already in the correct position
            if (foundNode !== oldNode) {
                log(`Moving keyed node: ${newKey}, Path: ${formatNodePath(oldPath!)}`);
                oldParent.insertBefore(foundNode!, oldNode!);
            } else {
                // Node is already in the right place, move to next
                [oldNode, oldPath] = walker.nextSibling(oldNode!, oldPath!);
            }
            // Update the node's contents
            updateNode(foundNode, newNode, walker, oldPath!, options);
        }
        // Case 2: No key match, but we have old nodes to update
        else if (oldNode) {
            checkOld = oldNode;
            [oldNode, oldPath] = walker.nextSibling(oldNode, oldPath!);
            // If the old node has a key, it should be preserved for later matching
            // Insert new node before it
            if (getKey(checkOld)) {
                log(
                    `Inserting new node before keyed node: ${getKey(checkOld)}, Path: ${formatNodePath(oldPath!)}`,
                );
                insertedNode = newNode.cloneNode(true);
                oldParent.insertBefore(insertedNode!, checkOld!);
            } else {
                // No key on old node, so we can update it in place
                updateNode(checkOld, newNode, walker, oldPath!, options);
            }
        }
        // Case 3: No more old nodes, append new node
        else {
            logNodeContents(newNode, "No more old nodes, append new node", parentPath);
            insertedNode = newNode.cloneNode(true);
            oldParent.appendChild(insertedNode!);
        }

        // Move to the next new node
        [newNode, newPath] = walker.nextSibling(newNode, newPath!);

        // If we updated an existing node (didn't insert), decrement extra count
        // since we've "consumed" an old node that doesn't need removal
        if (!insertedNode) {
            extra--;
        }
    }

    // Final cleanup phase - remove any nodes that weren't reused
    // Remove old keyed nodes that weren't matched
    for (oldKey in keyedNodes) {
        const nodeToRemove = keyedNodes![oldKey]!;
        if (!options?.shouldPreserveNode?.(nodeToRemove)) {
            logNodeContents(nodeToRemove, "Removing unused keyed node", parentPath);
            extra--;
            oldParent.removeChild(nodeToRemove);
        }
    }

    // Remove any remaining unkeyed nodes from the end
    while (--extra >= 0) {
        const lastChild = oldParent.lastChild!;
        if (!options?.shouldPreserveNode?.(lastChild)) {
            logNodeContents(lastChild, "Removing unused unkeyed node", parentPath);
            oldParent.removeChild(lastChild);
        } else {
            extra--;
        }
    }
}

/**
 * Returns the key identifier for a node based on 'key' attribute or 'id'.
 * Keys allow for efficient node reuse during diffing.
 */
function getKey(node: Node) {
    if (node instanceof Element) {
        return node.getAttribute("data-vite-dev-id") || node.getAttribute("key") || node.id;
    }
    return null;
}

/**
 * Utility that creates a walker to traverse the parsed HTML.
 */
function htmlWalker(html: string, options: Options): Walker {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    /**
     * Gets the first child of a node
     */
    function firstChild(node: Node, path: NodePath): [Node | null, NodePath | null] {
        if (!node) {
            return [null, null];
        }

        // Get the first child node
        let nextNode = node.firstChild;

        // Create the new path for the next node
        const nextPath: NodePath | null = nextNode ? { node: nextNode, parent: path } : null;

        return [nextNode, nextPath];
    }

    /**
     * Gets the next sibling of a node
     */
    function nextSibling(node: Node, path: NodePath): [Node | null, NodePath | null] {
        if (!node) {
            return [null, null];
        }

        // Get the next sibling node
        let nextNode = node.nextSibling;

        // Create the new path for the next node
        const nextPath: NodePath | null = nextNode ? { node: nextNode, parent: path.parent } : null;

        return [nextNode, nextPath];
    }

    // Return the walker with methods for traversing the parsed HTML
    return {
        root: doc.documentElement,
        firstChild,
        nextSibling,
        options,
    };
}
