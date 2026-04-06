import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInterestsTable1712435200000 implements MigrationInterface {
    name = 'CreateInterestsTable1712435200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Criar a nova tabela
        await queryRunner.query(`
            CREATE TABLE "user_interests" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "keyword" character varying NOT NULL,
                "user_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_interests_id" PRIMARY KEY ("id")
            )
        `);

        // 2. Adicionar a Foreign Key
        await queryRunner.query(`
            ALTER TABLE "user_interests" 
            ADD CONSTRAINT "FK_user_interests_user_id" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
        `);

        // 3. Migrar os dados (Backfill)
        // unnest() transforma o array em linhas individuais para inserção
        await queryRunner.query(`
            INSERT INTO "user_interests" (keyword, user_id)
            SELECT unnest(profile_keywords), id
            FROM "users"
            WHERE profile_keywords IS NOT NULL AND array_length(profile_keywords, 1) > 0
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remover a tabela (revertendo a migration)
        await queryRunner.query(`DROP TABLE "user_interests"`);
    }
}
