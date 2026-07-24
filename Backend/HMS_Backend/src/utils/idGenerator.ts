import { Prisma } from "@prisma/client";

export async function generateId(
    tx: Prisma.TransactionClient,
    entity: string
): Promise<string> {

    // Lock the row
    const rows = await tx.$queryRawUnsafe<any[]>(`
        SELECT *
        FROM id_sequences
        WHERE entity_name='${entity}'
        FOR UPDATE
    `);

    if (rows.length === 0) {

        throw new Error(`Sequence not found for ${entity}`);

    }

    const sequence = rows[0];

    const nextNumber = sequence.current_number + 1;

    await tx.id_sequences.update({

        where: {

            entity_name: entity

        },

        data: {

            current_number: nextNumber,

            updated_at: new Date()

        }

    });

    return sequence.prefix +
        nextNumber
            .toString()
            .padStart(3, "0");

}