import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
// import { Role } from 'src/roles/schema/roles.schema';

@Schema({
  timestamps: true,
})
export class User extends Document {
  @Prop({
    required: [true, 'name is required'],
  })
  username: string;

  @Prop({
    unique: [true, 'Duplicate Email'],
    required: [true, 'Email is required'],
  })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ unique: true })
  apiKey: string;

  @Prop()
  apiKeyRevoked: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
