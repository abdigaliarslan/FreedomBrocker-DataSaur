import { AST_NODE_TYPES } from "@typescript-eslint/typescript-estree";

export function normalizeEntity(entityToNormalize) {
    return entityToNormalize.type === AST_NODE_TYPES.ExportNamedDeclaration
        ? entityToNormalize.declaration
        : entityToNormalize;
}

export function getRootLevelEntityByName({
    parentEntity,
    entityName,
    identifierPropKey = "id",
}) {
    const { body } = parentEntity;

    const entity = body.find((item) => {
        let itemBody = normalizeEntity(item);

        return itemBody[identifierPropKey].name === entityName;
    });

    return normalizeEntity(entity);
}
